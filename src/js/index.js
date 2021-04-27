require("@babel/polyfill");
import Search from './model/search';
import { elements, renderLoader, clearLoader } from './view/base';
import * as searchView from './view/searchView';
import Recipe from './model/recipe';
import { renderRecipe, clearRecipe, highlightSelectedRecipe } from './view/recipeView';
import List from './model/list';
import * as listView from './view/listView';
import Like from './model/like';
import * as likesView from './view/likeView';
/**
 * Web аппын төлөв
 * - Хайлтын query, үр дүн
 * - Тухайн үзүүлж байгаа жор
 * - Лайкалсан жорууд
 * - Захиалж байгаа жорын найрлагууд
 */

const state = {};

/**
 *  Search Controller = Model --> Controller <-- View
 */

const controlSearch = async () => {
    // 1. Вэбээс хайлтын түлхүүр үгийг гаргаж авна.
    const query = searchView.getInput();

    if(query){
    // 2. Шинээр хайлтын обьектийг үүсгэж өгнө.
        state.search = new Search(query);

    // 3. Хайлт хийхэд зориулж дэлгэцийн UI-г бэлтгэнэ.
        searchView.clearSearchQuery();
        searchView.clearSearchResult();
        renderLoader(elements.searchResultDiv);

    // 4. Хайлтыг гүйцэтгэнэ.
        await state.search.doSearch();

    // 5. Хайлтын үр дүнг дэлгэцэнд үзүүлнэ.
        clearLoader();
        if (state.search.result === undefined) alert('Хайлтаар илэрцгүй.')
        else searchView.renderRecipes(state.search.result);
    }
};

elements.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch();
});

elements.pageButtons.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');

    if (btn) {
        const gotoPageNumber = parseInt(btn.dataset.goto, 10);

        searchView.clearSearchResult();
        searchView.renderRecipes(state.search.result, gotoPageNumber);
    }
});

/**
 *  Recipe controller
 */

const controlRecipe = async () => {
    // 1. URL-аас ID-ийг салгаж авна.
    const id = window.location.hash.replace('#', '');

    if(id){
    // 2. Жорын моделийг үүсгэж өгнө. 
    state.recipe = new Recipe(id);

    // 3. UI-ийг бэлтгэнэ.
    clearRecipe();
    renderLoader(elements.recipeDiv);
    highlightSelectedRecipe(id);

    // 4. Жороо татаж авчирна.
    await state.recipe.getRecipe();

    // 5. Жорыг гүйцэтгэх хугацаа болох орцыг тооцоолно.
    clearLoader();
    state.recipe.calcTime();
    state.recipe.calcPortion();

    // 6. Жороо дэлгэцэнд гаргана.
    renderRecipe(state.recipe, state.likes.isLiked(id));
    }
};

// window.addEventListener('hashchange', controlRecipe);
// window.addEventListener('load', controlRecipe);

['hashchange', 'load'].forEach(e => window.addEventListener(e, controlRecipe));

window.addEventListener('load', e => {
    // Шинээр лайк моделийг апп дөнгөж ачааллагдахад үүсгэнэ.
    if (!state.likes) state.likes = new Like();

    // Like цэсийг гаргах эсэхийг шийдэх.
    likesView.toggleLikeMenu(state.likes.getNumberOfLikes());

    // Лайкууд байвал тэдгээрийг цэсэнд нэмж харуулна.
    state.likes.likes.forEach(like => likesView.renderLike(like));
});


/**
 *  Ingredients controller
 */

const controlList = () => {
    // Найрлаганы моделийг үүсгэнэ.
    state.list = new List();

    // Өмнө харагдаж байсан найрлагануудыг дэлгэцээс зайлуулна.
    listView.clearItems();

    // Уг модел руу харагдаж байгаа бүх найрлагыг авч хийнэ.
    state.recipe.ingredients.forEach(n => {
        // Тухайн найрлагыг модел рүү оруулна.
        const item = state.list.addItem(n); 
        // Тухайн найрлагыг дэлгэцэнд гаргана.
        listView.renderItem(item);
    });
};

/**
 *  Like controller
 */

 const controlLike = () => {
    // 1. Лайкийн моделийг үүсгэнэ.
    if (!state.likes) state.likes = new Like();

    // 2. Одоо харагдаж байгаа жорын ID-ийг олж авах.
    const currentRecipeId = state.recipe.id;

    // 3. Энэ жорыг лайкласан эсэхийг шалгах.
    if (state.likes.isLiked(currentRecipeId)) {
        // Лайкласан бол лайкийг нь болиулна.
        state.likes.deleteLike(currentRecipeId);
        
        // Лайк товчны лайкалсан байдлыг болиулах.
        likesView.toggleLikeBtn(false);

        // Лайкыг цэснээс устгана.
        likesView.deleteLike(currentRecipeId);

    } else {
        // Лайклаагүй бол лайклана.
        const newLike = state.likes.addLike(currentRecipeId, state.recipe.title, state.recipe.publisher, state.recipe.image_url);
        
        // Лайк товчны лайкалсан байдлыг лайкалсан болгох.
        likesView.toggleLikeBtn(true);
        
        // Лайк цэсэнд энэ лайкыг оруулах.
        likesView.renderLike(newLike);
    }

    likesView.toggleLikeMenu(state.likes.getNumberOfLikes());
};

elements.shoppingList.addEventListener('click', e => {
    // Click хийсэн li элементийн data-itemid аттрибутыг гаргаж авах.
    const id = e.target.closest('.shopping__item').dataset.itemid;

    // Олдсон ID-тэй орцыг моделоос устгана.
    state.list.deleteItem(id);

    // Дэлгэцээс адил ID-тэй орцыг устгана.
    listView.deleteItem(id);
});

elements.recipeDiv.addEventListener('click', e => {
    if(e.target.matches('.recipe__btn, .recipe__btn *')) {
        controlList();
    } else if (e.target.matches('.recipe__love, .recipe__love *')) {
        controlLike();
    }
});